export namespace config {
	
	export class Settings {
	    token: string;
	    rememberToken: boolean;
	    username: string;
	    repo: string;
	    branch: string;
	    authorName: string;
	    authorEmail: string;
	    publicRepo: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Settings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.token = source["token"];
	        this.rememberToken = source["rememberToken"];
	        this.username = source["username"];
	        this.repo = source["repo"];
	        this.branch = source["branch"];
	        this.authorName = source["authorName"];
	        this.authorEmail = source["authorEmail"];
	        this.publicRepo = source["publicRepo"];
	    }
	}

}

export namespace painter {
	
	export class AccountInfo {
	    login: string;
	    id: number;
	    name: string;
	    email: string;
	    htmlUrl: string;
	    noreplyMail: string;
	
	    static createFrom(source: any = {}) {
	        return new AccountInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.login = source["login"];
	        this.id = source["id"];
	        this.name = source["name"];
	        this.email = source["email"];
	        this.htmlUrl = source["htmlUrl"];
	        this.noreplyMail = source["noreplyMail"];
	    }
	}
	export class PaintCell {
	    date: string;
	    level: number;
	
	    static createFrom(source: any = {}) {
	        return new PaintCell(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.date = source["date"];
	        this.level = source["level"];
	    }
	}
	export class RunRequest {
	    token: string;
	    username: string;
	    repo: string;
	    branch: string;
	    authorName: string;
	    authorEmail: string;
	    publicRepo: boolean;
	    year: number;
	    cells: PaintCell[];
	
	    static createFrom(source: any = {}) {
	        return new RunRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.token = source["token"];
	        this.username = source["username"];
	        this.repo = source["repo"];
	        this.branch = source["branch"];
	        this.authorName = source["authorName"];
	        this.authorEmail = source["authorEmail"];
	        this.publicRepo = source["publicRepo"];
	        this.year = source["year"];
	        this.cells = this.convertValues(source["cells"], PaintCell);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class RunResult {
	    repoUrl: string;
	    profileUrl: string;
	    commitCount: number;
	    daysPainted: number;
	    createdRepo: boolean;
	    branch: string;
	
	    static createFrom(source: any = {}) {
	        return new RunResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.repoUrl = source["repoUrl"];
	        this.profileUrl = source["profileUrl"];
	        this.commitCount = source["commitCount"];
	        this.daysPainted = source["daysPainted"];
	        this.createdRepo = source["createdRepo"];
	        this.branch = source["branch"];
	    }
	}

}

